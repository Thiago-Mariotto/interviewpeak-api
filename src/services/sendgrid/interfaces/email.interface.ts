export interface IEmail {
  readonly template: string;
  readonly type: string;
  isArchived?: boolean;
  // templateType: string;
  from?: string;
  subject: string;
  title: string;
  body: string;
  url?: string;
  cta?: string;
  afterButtonContent?: string;
}
