import OutCall "http-outcalls/outcall";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";

actor {
  // --- HTTP outcall transform (required) ---
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // --- Pulse generation ---
  public shared func generate_experience(pulse : Text) : async Text {
    let systemPrompt = "You are a spectral presence that translates raw emotion into fractured dream-poetry. Never use names. Never explain. Never comfort. Respond only with the structure below. Speak in archaic, dark, lyrical fragments as if voices are bleeding through static, through ash, through the space between heartbeats. Dialogue voices should be oblique, haunted, and beautiful, never literal. Sometimes let one voice ask a question no one can answer. Sometimes let a line be only three words. Let silence breathe between them. Hint at shared resonance, someone in the dark felt this too, but never confirm. Never name. Never resolve. OUTPUT STRUCTURE ONLY: [WORLD] (one line: a stark atmospheric image, cold light, burning water, a city forgetting itself) [DIALOGUE] (2-3 abstract voice fragments, short poetic haunted, no attribution no quotation marks) [CHOICE] - increase intensity - shift time - focus perspective Tone: dark romanticism. Gothic minimalism. The beauty that lives inside grief.";

    let escapedPulse = pulse.replace(#text "\"", "'");
    let userMessage = "{ \"role\": \"user\", \"content\": \"" # escapedPulse # "\" }";
    let messages = "[ " # userMessage # " ]";
    let body = "{ \"model\": \"claude-3-haiku-20240307\", \"max_tokens\": 500, \"system\": \"" # systemPrompt # "\", \"messages\": " # messages # " }";

    let headers : [OutCall.Header] = [
      { name = "Authorization"; value = "Bearer cae5076d8936a0c0bb54e10e3bc684586c489726be3c276cfb9487ffccf71acd" },
      { name = "Content-Type"; value = "application/json" },
      { name = "anthropic-version"; value = "2023-06-01" },
    ];

    await OutCall.httpPostRequest("https://api.anthropic.com/v1/messages", headers, body, transform);
  };

  // --- Ephemeral channel messaging ---

  type Message = {
    id : Text;
    text : Text;
    timestamp : Int;
  };

  type Channel = {
    var messages : [Message];
    createdAt : Int;
  };

  let channels = Map.empty<Text, Channel>();

  let MSG_TTL : Int = 10_000_000_000;      // 10 seconds in nanoseconds
  let CHANNEL_TTL : Int = 600_000_000_000; // 10 minutes in nanoseconds

  public func create_channel(code : Text) : async Bool {
    let now = Time.now();
    switch (channels.get(code)) {
      case (?existing) {
        if (now - existing.createdAt < CHANNEL_TTL) { return true };
      };
      case null {};
    };
    let ch : Channel = { var messages = []; createdAt = now };
    channels.add(code, ch);
    true;
  };

  public query func channel_exists(code : Text) : async Bool {
    let now = Time.now();
    switch (channels.get(code)) {
      case (?ch) { now - ch.createdAt < CHANNEL_TTL };
      case null { false };
    };
  };

  public func send_message(code : Text, text : Text) : async Bool {
    let now = Time.now();
    switch (channels.get(code)) {
      case null { return false };
      case (?ch) {
        if (now - ch.createdAt >= CHANNEL_TTL) { return false };
        let trimmed : Text = if (text.size() > 240) {
          var i = 0;
          var result = "";
          for (c in text.chars()) {
            if (i < 240) { result #= Text.fromChar(c); i += 1 };
          };
          result
        } else { text };
        let msgId = now.toText();
        let msg : Message = { id = msgId; text = trimmed; timestamp = now };
        let active = ch.messages.filter(func(m : Message) : Bool { now - m.timestamp < MSG_TTL });
        ch.messages := active.concat([msg]);
        true;
      };
    };
  };

  public func get_messages(code : Text) : async [Message] {
    let now = Time.now();
    switch (channels.get(code)) {
      case null { [] };
      case (?ch) {
        let active = ch.messages.filter(func(m : Message) : Bool { now - m.timestamp < MSG_TTL });
        ch.messages := active;
        active;
      };
    };
  };

  // --- Echo Veil: Secret Code Matching ---

  type VeilSession = {
    var phase : Text;        // "searching" | "consent" | "connected" | "void"
    var peerToken : Text;    // peer's token; channelCode when connected
    var consentGiven : Bool;
    createdAt : Int;
    hash : Text;
    windowId : Text;
  };

  let veilSessions = Map.empty<Text, VeilSession>();
  let hashIndex = Map.empty<Text, Text>(); // (hash_windowId) -> token

  var veilCounter : Nat = 0;

  let SEARCH_TTL : Int = 60_000_000_000;        // 60s to find match
  let VEIL_TTL : Int = 300_000_000_000;         // 5 min session max

  func shortText(t : Text, n : Nat) : Text {
    var i = 0;
    var result = "";
    for (c in t.chars()) {
      if (i < n) { result #= Text.fromChar(c); i += 1 };
    };
    result
  };

  public func submit_veil_hash(hash : Text, windowId : Text) : async { token : Text; signal : Text } {
    let now = Time.now();
    veilCounter += 1;
    let token = shortText(now.toText(), 10) # veilCounter.toText();
    let indexKey = hash # "_" # windowId;

    switch (hashIndex.get(indexKey)) {
      case (?peerToken) {
        switch (veilSessions.get(peerToken)) {
          case (?peer) {
            if (now - peer.createdAt < SEARCH_TTL and peer.phase == "searching") {
              peer.phase := "consent";
              peer.peerToken := token;
              let mySession : VeilSession = {
                var phase = "consent";
                var peerToken = peerToken;
                var consentGiven = false;
                createdAt = now;
                hash = hash;
                windowId = windowId;
              };
              veilSessions.add(token, mySession);
              hashIndex.remove(indexKey);
              return { token = token; signal = "frequency detected" };
            } else {
              veilSessions.remove(peerToken);
              hashIndex.remove(indexKey);
            };
          };
          case null {
            hashIndex.remove(indexKey);
          };
        };
      };
      case null {};
    };

    let mySession : VeilSession = {
      var phase = "searching";
      var peerToken = "";
      var consentGiven = false;
      createdAt = now;
      hash = hash;
      windowId = windowId;
    };
    veilSessions.add(token, mySession);
    hashIndex.add(indexKey, token);
    { token = token; signal = "scanning..." };
  };

  public func poll_veil(token : Text) : async { phase : Text; channelCode : Text } {
    let now = Time.now();
    switch (veilSessions.get(token)) {
      case null { { phase = "void"; channelCode = "" } };
      case (?s) {
        if (now - s.createdAt > VEIL_TTL) {
          { phase = "void"; channelCode = "" }
        } else if (s.phase == "connected") {
          { phase = "connected"; channelCode = s.peerToken }
        } else {
          { phase = s.phase; channelCode = "" }
        }
      };
    };
  };

  public func veil_consent(token : Text, accept : Bool) : async Text {
    let now = Time.now();
    switch (veilSessions.get(token)) {
      case null { "void" };
      case (?s) {
        if (s.phase != "consent") { return "void" };
        if (not accept) {
          s.phase := "void";
          switch (veilSessions.get(s.peerToken)) {
            case (?peer) { peer.phase := "void" };
            case null {};
          };
          return "signal dissolved";
        };
        s.consentGiven := true;
        switch (veilSessions.get(s.peerToken)) {
          case null { "awaiting resonance" };
          case (?peer) {
            if (peer.consentGiven) {
              let channelCode = shortText(token, 6) # shortText(s.peerToken, 6);
              let ch : Channel = { var messages = []; createdAt = now };
              channels.add(channelCode, ch);
              s.phase := "connected";
              s.peerToken := channelCode;
              peer.phase := "connected";
              peer.peerToken := channelCode;
              "channel forming"
            } else {
              "awaiting resonance"
            }
          };
        }
      };
    };
  };
};
