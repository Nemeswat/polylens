export interface Packet {
  sequence: string;
  createTime: number;
  endTime: number;
  sendTx: string;
  ackTx: string;
}