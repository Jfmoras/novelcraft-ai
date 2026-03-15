const workerScript = `
  self.onmessage = function(e) {
    const { id, delay } = e.data;
    setTimeout(() => {
      self.postMessage(id);
    }, delay);
  };
`;

const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
const worker = new Worker(workerUrl);

const callbacks = new Map<number, () => void>();
let nextId = 1;

worker.onmessage = (e) => {
  const id = e.data;
  const callback = callbacks.get(id);
  if (callback) {
    callback();
    callbacks.delete(id);
  }
};

export function setBackgroundTimeout(callback: () => void, delay: number): number {
  const id = nextId++;
  callbacks.set(id, callback);
  worker.postMessage({ id, delay });
  return id;
}

export function clearBackgroundTimeout(id: number) {
  callbacks.delete(id);
}
