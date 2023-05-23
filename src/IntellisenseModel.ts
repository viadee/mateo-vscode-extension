import { Nullable } from "./utils/Nullable";

/**
 * Representation of a repository that is used inside the script (document).
 */
export default interface IntellisenseModel {
  /**
   * The alias that is used to access the repository.
   */
  aliasName: Nullable<string>;
  /**
   * The file name of the repository.
   */
  repoName: string;
  /**
   * The name of the step.
   * e.g. MyStep
   */
  stepName: string;
  /**
   * The snippet that corresponds to the above step.
   * e.g. MyStep(ParamName1 = "$", ParamName2 = "$") 
   */
  snippet: string;
}
