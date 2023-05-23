export default interface RepositoryModel {
  imported: boolean;
  name: string;
  repositoryDirectoryPath: string;
  repositoryFilePath: string;
  repoItems: [
    {
      itemType: string;
      stepDescription: string;
      stepId: number;
      stepName: string;
      stepParamDescriptions: {
        Message: string;
      };
      stepParams: string[];
    }
  ];
}
