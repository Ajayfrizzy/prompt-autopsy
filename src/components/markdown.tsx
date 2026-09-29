import {Fragment} from 'react';
/** Small inert Markdown view: no HTML, images, embedded links or execution. */
export function Markdown({text}:{text:string}) {
 const lines=text.split(/\r?\n/);const output:React.ReactNode[]=[];let code:string[]|null=null;
 for(const [i,line] of lines.entries()){
  if(/^\s*```/.test(line)){if(code){output.push(<pre key={i}>{code.join('\n')}</pre>);code=null;}else code=[];continue;}
  if(code){code.push(line);continue;}
  if(/^#{1,6} /.test(line)){output.push(<h3 className="spaced" key={i}>{line.replace(/^#{1,6} /,'')}</h3>);continue;}
  if(/^\s*[-*] /.test(line)){output.push(<p key={i}>• {line.replace(/^\s*[-*] /,'')}</p>);continue;}
  output.push(<Fragment key={i}>{line?<p className="preserve">{line}</p>:<br/>}</Fragment>);
 }
 if(code)output.push(<pre key="unclosed">{code.join('\n')}</pre>);
 return <div className="markdown">{output}</div>;
}
