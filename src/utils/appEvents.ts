export const APP_DELETE_SUCCESS_EVENT =
  "frpam:delete-success";

export interface DeleteSuccessEventDetail {
  title?: string;
  message?: string;
  url?: string;
}
