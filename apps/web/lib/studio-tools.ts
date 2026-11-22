export type StudioTool={slug:string;name:string;description:string;pro:boolean;icon:string};
export const studioTools:StudioTool[]=[
{slug:'memory-jar',name:'Memory Jar',description:'Choose a colour or animal to reveal a memory.',pro:false,icon:'◉'},
{slug:'love-letter',name:'Love Letter / Poem',description:'An envelope, your words, a poem and optional voice.',pro:false,icon:'✉'},
{slug:'art4u',name:'Art4U',description:'Funny or meaningful art made for one person.',pro:false,icon:'✎'},
];
export const freeStudioSlugs=new Set(studioTools.filter(x=>!x.pro).map(x=>x.slug));
