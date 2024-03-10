export interface Chain {
  id: number;
  display: string;
  rpc: string;
  proofDispatcher: string;
  simDispatcher: string;
  blockTime: number;
  icon: () => JSX.Element;
}
