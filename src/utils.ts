import os from 'os';

export const printServedEndpoints = (port: number) => {
  try {
    const interfaces = os.networkInterfaces();
    const list = Object.keys(interfaces)
      .map((name) =>
        (interfaces[name] ?? []).filter((item) => item.family === 'IPv4')
      )
      .filter((l) => l.length > 0)
      .flat();
    const localInterface = list.find((item) => item.internal);
    const networkInterface = list.find((item) => !item.internal);
    console.log('\n🚀 Serving!');
    console.log('--------------------------------------------');
    console.log(`Local: https://0.0.0.0:${port}`);
    if (localInterface) {
      console.log(`Local: https://${localInterface.address}:${port}`);
    }
    if (networkInterface) {
      console.log(`Network: https://${networkInterface.address}:${port}`);
    }
    console.log('--------------------------------------------');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e: unknown) {
    console.log('\n🚀 Serving!');
    console.log('--------------------------------------------');
    console.log(`Local: http://0.0.0.0:${port}`);
    console.log(`Local: http://127.0.0.1:${port}`);
    console.log('--------------------------------------------');
  }
};

export const extractFileInfo = (url: string) => {
  // Split the pathname into segments
  const segments = url.split('/');

  // Get the last segment (filename)
  const filename = segments[segments.length - 1].replace(/\?.*$/, '');

  // Extract the file extension
  const fileExtension = filename.split('.').pop();

  // Construct the relative path (excluding the filename)
  const relativePath = segments.slice(0, -1).join('/');

  // Create the output object
  const fileInfo = {
    fileName: filename,
    relativePath: relativePath,
    fileExtension: fileExtension,
  } as {
    fileName: string;
    relativePath: string;
    fileExtension: string;
  };

  return fileInfo;
};
