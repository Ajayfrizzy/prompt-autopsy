'use client';
import {useLayoutEffect, useRef, type TextareaHTMLAttributes} from 'react';

// React can preserve a browser-restored DOM value during hydration even when
// the controlled prop is unchanged. Reassert the in-memory value at lifecycle
// boundaries; never import a restored DOM value into the investigation.
export function SessionTextarea({value, ...props}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'|'defaultValue'> & {value: string}) {
  const element = useRef<HTMLTextAreaElement>(null);
  const current = useRef(value);
  current.current = value;
  const sync = () => { if (element.current && element.current.value !== current.current) element.current.value = current.current; };
  useLayoutEffect(sync);
  useLayoutEffect(() => {
    let frame = 0;
    const restore = () => { sync(); cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
    restore();
    window.addEventListener('pageshow', restore);
    window.addEventListener('focus', restore);
    document.addEventListener('visibilitychange', restore);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pageshow', restore); window.removeEventListener('focus', restore); document.removeEventListener('visibilitychange', restore); };
  }, []);
  return <textarea {...props} ref={element} value={value} autoComplete="off" onFocus={e => {sync(); props.onFocus?.(e);}} />;
}

// The native picker is a transient transport, never the visible source record.
// Clear it after selection (also permits re-selecting the same file). Only the
// filename committed with parsed application state is displayed.
export function SessionFileInput({label, accept, filename, onFile}: {label:string;accept:string;filename:string|null;onFile:(file:File)=>void}) {
  const element=useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {if(element.current)element.current.value='';});
  useLayoutEffect(() => {
    const clear=()=>{if(element.current)element.current.value='';};
    window.addEventListener('pageshow',clear);
    return ()=>window.removeEventListener('pageshow',clear);
  },[]);
  return <span className="session-file-control">
    <input ref={element} className="session-file-native" type="file" accept={accept} aria-label={label} autoComplete="off" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)onFile(file);}}/>
    <span aria-hidden="true" className="session-file-button">Choose file</span>
    <span role="status" aria-label={`${label} filename`}>{filename??'No file selected'}</span>
  </span>;
}
