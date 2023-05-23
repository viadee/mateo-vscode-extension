import RepositoryModel from "../RepositoryModel";
import StepCompletion from "../StepCompletion";

export default class RepositoryProcessor {
  public static convertStepToSnippet(model: RepositoryModel): Array<StepCompletion> {
    let snippets: Array<StepCompletion> = [];
    for (let i = 0; i < model.repoItems.length; i++) {
      let step = model.repoItems[i].stepName;
      let snippet = step + "(";
      for (
        let paramIndex = 0;
        paramIndex < model.repoItems[i].stepParams.length;
        paramIndex++
      ) {
        snippet +=
          model.repoItems[i].stepParams[paramIndex] +
          ' = "$' +
          (paramIndex + 1) +
          '"';
        if (paramIndex + 1 < model.repoItems[i].stepParams.length) {
          snippet += ",";
        }
      }
      snippet += ")";
      if (snippet) {
        snippets.push({snippet:snippet, stepname:step});
      }
    }
    return snippets;
  }
}
