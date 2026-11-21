export async function sendEmail(input:{to:string;subject:string;html:string}){
  const provider=(process.env.EMAIL_PROVIDER||'').toLowerCase();
  if(provider==='resend'&&process.env.EMAIL_API_KEY){
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${process.env.EMAIL_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM||'MWAHLI <hello@mwahli.app>',to:[input.to],subject:input.subject,html:input.html})});
    if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
    return response.json();
  }
  if(process.env.NODE_ENV!=='production'){
    console.info('[MWAHLI email dev fallback]',{to:input.to,subject:input.subject,html:input.html});
    return {id:'dev-console'};
  }
  throw new Error('EMAIL_PROVIDER is not configured');
}
