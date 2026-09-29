// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {renderToString} from 'react-dom/server';
import {hydrateRoot,type Root} from 'react-dom/client';
import {Workspace} from '../../src/components/workspace';
const sample=readFileSync('public/samples/transcript.txt','utf8');
const nativeValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;
function restored(node:HTMLElement,text:string){nativeValue.call(node,text);}
function show(persisted=false){const event=new Event('pageshow');Object.defineProperty(event,'persisted',{value:persisted});fireEvent(window,event);}
function upload(label:string,name:string,text:string){const file=new File([text],name);Object.defineProperty(file,'arrayBuffer',{value:async()=>new TextEncoder().encode(text).buffer});fireEvent.change(screen.getByLabelText(label),{target:{files:[file]}});}
let root:Root|undefined;let container:HTMLDivElement|undefined;
beforeEach(()=>vi.stubGlobal('fetch',vi.fn()));
afterEach(()=>{if(root){act(()=>root!.unmount());root=undefined;}container?.remove();container=undefined;cleanup();vi.unstubAllGlobals();});

describe('browser form restoration cannot become phantom session data',()=>{
 it('reconciles a restored incident and transcript during actual hydration',async()=>{
  container=document.createElement('div');container.innerHTML=renderToString(<Workspace/>);document.body.append(container);
  const beforeHydration=screen.getByLabelText('Incident description');
  restored(beforeHydration,'Restored before hydration');
  restored(screen.getByLabelText('Structured transcript'),sample);
  expect(screen.getByLabelText('Incident description')).toHaveValue('Restored before hydration');
  await act(async()=>{root=hydrateRoot(container!,<Workspace/>);});
  expect(screen.getByLabelText('Incident description')).not.toBe(beforeHydration);
  expect(screen.getByLabelText('Incident description')).toHaveValue('');
  expect(screen.getByLabelText('Structured transcript')).toHaveValue('');
  expect(screen.getByText('0 / 2,048 bytes')).toBeInTheDocument();
  expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('No file selected');
  expect(screen.getByLabelText('Historical instructions filename')).toHaveTextContent('No file selected');
  expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeDisabled();
 });
 it('ordinary pageshow leaves existing React controls mounted',()=>{
  render(<Workspace/>);const incident=screen.getByLabelText('Incident description');
  fireEvent.change(incident,{target:{value:'Item ₦'}});show();
  expect(screen.getByLabelText('Incident description')).toBe(incident);
  expect(incident).toHaveValue('Item ₦');expect(screen.getByText('8 / 2,048 bytes')).toBeInTheDocument();
 });
 it('commits filenames only with valid parsed sources and clears them on invalid replacement',async()=>{
  render(<Workspace/>);fireEvent.change(screen.getByLabelText('Incident description'),{target:{value:'An incident'}});
  upload('Upload transcript','transcript.txt',sample);
  await waitFor(()=>expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('transcript.txt'));
  expect(screen.getByText('5 recognized messages · stable references assigned')).toBeInTheDocument();
  expect(screen.getByText('M001')).toBeInTheDocument();
  upload('Historical instructions','AGENTS.md','Keep logs.');
  await waitFor(()=>expect(screen.getByLabelText('Historical instructions filename')).toHaveTextContent('AGENTS.md'));
  expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeEnabled();
  upload('Upload transcript','broken.txt','not a transcript');
  await waitFor(()=>expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('No file selected');
  expect(screen.queryByText(/5 recognized messages/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'transcript'}));
  expect(screen.getByText('Your parsed messages will appear here.')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeDisabled();
  upload('Historical instructions','wrong.md','Invalid replacement');
  await waitFor(()=>expect(screen.getByLabelText('Historical instructions filename')).toHaveTextContent('No file selected'));
  fireEvent.click(screen.getByRole('button',{name:'rules'}));
  expect(screen.getByText('Preview the instructions that existed during the incident.')).toBeInTheDocument();
 });
 it('resets a back/forward-restored document to empty Import with no source filenames',async()=>{
  render(<Workspace/>);fireEvent.change(screen.getByLabelText('Incident description'),{target:{value:'Old incident'}});
  upload('Upload transcript','transcript.txt',sample);upload('Historical instructions','CLAUDE.md','Keep items.');
  await waitFor(()=>expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:/Review sensitive content/}));
  show(true);
  expect(screen.getByLabelText('Incident description')).toHaveValue('');
  expect(screen.getByLabelText('Structured transcript')).toHaveValue('');
  expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('No file selected');
  expect(screen.getByLabelText('Historical instructions filename')).toHaveTextContent('No file selected');
  expect(screen.getByText('0 / 2,048 bytes')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
 });
 it('fresh mount discards valid prior filenames and redacted paste content stays aligned during a session',async()=>{
  const view=render(<Workspace/>);
  fireEvent.change(screen.getByLabelText('Incident description'),{target:{value:'Old incident'}});
  upload('Upload transcript','transcript.txt',sample);upload('Historical instructions','AGENTS.md','Keep items.');
  await waitFor(()=>expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:/Review sensitive content/}));
  fireEvent.change(screen.getByLabelText('Review M001'),{target:{value:'Reviewed replacement message'}});
  fireEvent.click(screen.getByRole('button',{name:/1Import/}));
  expect((screen.getByLabelText('Structured transcript') as HTMLTextAreaElement).value).toContain('Reviewed replacement message');
  expect(screen.getByLabelText('Structured transcript')).not.toHaveValue(sample);
  expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('transcript.txt');
  view.unmount();render(<Workspace/>);
  expect(screen.getByLabelText('Incident description')).toHaveValue('');
  expect(screen.getByLabelText('Structured transcript')).toHaveValue('');
  expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('No file selected');
  expect(screen.getByLabelText('Historical instructions filename')).toHaveTextContent('No file selected');
  expect(screen.getByRole('button',{name:/Review sensitive content/})).toBeDisabled();
 });
 it('does not commit an in-flight file read into a reset session',async()=>{
  render(<Workspace/>);let resolve!:(buffer:ArrayBuffer)=>void;
  const file=new File([sample],'old.txt');Object.defineProperty(file,'arrayBuffer',{value:()=>new Promise<ArrayBuffer>(r=>{resolve=r;})});
  fireEvent.change(screen.getByLabelText('Upload transcript'),{target:{files:[file]}});
  show(true);
  await act(async()=>resolve(new TextEncoder().encode(sample).buffer));
  expect(screen.getByLabelText('Structured transcript')).toHaveValue('');
  expect(screen.getByLabelText('Upload transcript filename')).toHaveTextContent('No file selected');
  expect(screen.queryByText('M001')).not.toBeInTheDocument();
 });
});
