export type StudioTool={slug:string;name:string;description:string;pro:boolean;icon:string};
export const studioTools:StudioTool[]=[
{slug:'memory-jar',name:'Memory Jar',description:'Choose a colour or animal to reveal a memory.',pro:false,icon:'◉'},
{slug:'love-letter',name:'Love Letter / Poem',description:'An envelope, your words, a poem and optional voice.',pro:false,icon:'✉'},
{slug:'art4u',name:'Art4U',description:'Funny or meaningful art made for one person.',pro:false,icon:'✎'},
{slug:'photo-puzzle',name:'Photo Puzzle',description:'Blur, guess, reveal or rebuild a shared moment.',pro:false,icon:'◇'},
{slug:'love-cards',name:'Love Cards',description:'One thing I love. One ridiculous memory. Open when you are sad.',pro:true,icon:'♡'},
{slug:'our-timeline',name:'Our Timeline',description:'Scroll the story you choose to keep.',pro:true,icon:'↝'},
{slug:'open-when',name:'Open When…',description:'Private envelopes unlocked by date or moment.',pro:true,icon:'⌁'},
{slug:'voice-capsule',name:'Voice Capsule',description:'Sequence short voice notes from one or many people.',pro:true,icon:'◖'},
{slug:'story-path',name:'Story Path',description:'Choose-what-happened-next stories and inside jokes.',pro:true,icon:'⌘'},
{slug:'custom-room',name:'Custom Room',description:'Start blank and make the room yours.',pro:true,icon:'✦'}
];
export const freeStudioSlugs=new Set(studioTools.filter(x=>!x.pro).map(x=>x.slug));
