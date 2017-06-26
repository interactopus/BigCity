// загрузка svg файлов в typescript
declare module "*!raw-loader" {
  const content: any;
  export default content;
}
declare module "*.svg" {
  const content: any;
  export default content;
}
