import type { ErrorObject } from "ajv";

declare const validate: {
  (data: any): boolean;
  errors?: ErrorObject[] | null;
};

export default validate;