export interface ISendgridParam {
  readonly to: string | string[];
  readonly attachments?: any;
  readonly from?: string;
}
