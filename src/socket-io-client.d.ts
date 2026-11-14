declare module "socket.io-client" {
  import type { RealtimeEvent } from "./lib/types";
  export type Socket = {
    on(
      event: "nft.updated" | "order.updated",
      listener: (event: RealtimeEvent) => void,
    ): Socket;
    on(event: "connect", listener: () => void): Socket;
    removeAllListeners(): Socket;
    disconnect(): Socket;
  };
  export function io(
    url: string,
    options?: {
      path?: string;
      transports?: string[];
      reconnection?: boolean;
      auth?: Record<string, unknown>;
    },
  ): Socket;
}
