// Keep a request identity through network retries; edited forms start a new request.
// The server independently validates the payload and commits this identity atomically.
export function bookingRequestKey(ref: {current: {payload:string;key:string}|null}, payload: unknown): string {
  const encoded=JSON.stringify(payload);
  if(ref.current?.payload!==encoded)ref.current={payload:encoded,key:crypto.randomUUID()};
  return ref.current.key;
}
