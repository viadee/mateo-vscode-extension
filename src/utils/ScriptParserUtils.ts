export default class ScriptParserUtils {
  public static lineIncludesRepository(line: string): boolean {
    let check = line.match(/\t*use\s+([^*&%\s]+).*/);
    return check !== null && check.length > 0;
  }
}
