import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ChannelMessage {
    id: string;
    text: string;
    timestamp: bigint;
}
export interface VeilResult {
    token: string;
    signal: string;
}
export interface VeilStatus {
    phase: string;
    channelCode: string;
}
export interface backendInterface {
    generate_experience(pulse: string): Promise<string>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    create_channel(code: string): Promise<boolean>;
    channel_exists(code: string): Promise<boolean>;
    send_message(code: string, text: string): Promise<boolean>;
    get_messages(code: string): Promise<Array<ChannelMessage>>;
    submit_veil_hash(hash: string, windowId: string): Promise<VeilResult>;
    poll_veil(token: string): Promise<VeilStatus>;
    veil_consent(token: string, accept: boolean): Promise<string>;
}
