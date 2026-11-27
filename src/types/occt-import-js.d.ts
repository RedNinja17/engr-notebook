export {};

declare global {
  interface Window {
    occtimportjs?: (options?: { locateFile?: (file: string) => string }) => Promise<{
      ReadStepFile(bytes: Uint8Array, params?: Record<string, unknown>): {
        success: boolean;
        meshes: Array<{
          attributes: {
            position: { array: ArrayLike<number> };
            normal?: { array: ArrayLike<number> };
          };
          index?: { array: ArrayLike<number> };
        }>;
      };
    }>;
  }
}
