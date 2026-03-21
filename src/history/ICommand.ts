export interface ICommand {
  readonly description?: string;
  readonly label?: string;
  execute(): void;
  undo(): void;
}
