export type ModuleKey = 'people'|'studio'|'muse'|'moments'|'id'|'surprise'|'gifts'|'creators'|'care'|'local'|'together'|'capsule'|'keeps'|'exchange'|'receipt'|'loop';

export const modules: Record<ModuleKey,{title:string;kicker:string;description:string;cta:string}> = {
  people:{title:'People',kicker:'Relationship graph',description:'Keep the people, moments and traditions you choose to remember. Private by default.',cta:'Add someone'},
  studio:{title:'Studio',kicker:'Interactive love builder',description:'Make them something only you could give. Create memory jars, letters, poems and artwork.',cta:'Start making'},
  muse:{title:'Muse',kicker:'AI love concierge',description:'Tell me about them and what is happening. I will suggest digital, local and care options without pretending to be you.',cta:'Tell Muse'},
  moments:{title:'Moments',kicker:'Moment graph',description:'Birthdays matter. So do rough weeks, exams, reunions, grief, promotions and no-occasion-at-all days.',cta:'Add a moment'},
  id:{title:'Gift ID',kicker:'Preference passport',description:'Keep the surprise. Get the details right. Share only the preference a transaction actually needs.',cta:'Set preferences'},
  surprise:{title:'Surprise',kicker:'Consentful surprise',description:'Ask for a size, colour, dietary detail or availability without revealing what is being planned.',cta:'Ask privately'},
  gifts:{title:'Gifts',kicker:'Curated marketplace',description:'Send something thoughtful from verified merchants, artisans and makers. Products come after the person.',cta:'Browse thoughtfully'},
  creators:{title:'Creators',kicker:'Human craft',description:'Tell a creator the story behind the gift. Commission poets, illustrators, musicians, makers and hosts.',cta:'Find a creator'},
  care:{title:'Care',kicker:'Care commerce',description:'What would make this week easier for them? Coordinate meals, errands, rides and check-ins around their boundaries.',cta:'Make a care plan'},
  local:{title:'Local',kicker:'Global-to-local fulfilment',description:'Pay here. Make it happen near them. Use local providers when timing and freshness matter more than international shipping.',cta:'See nearby options'},
  together:{title:'Together',kicker:'Group gifting',description:'Bring the people who love them into one room. Contribute privately, vote, collect notes and deliver once.',cta:'Start a group room'},
  capsule:{title:'Capsule',kicker:'Future love',description:'Say it now. Let them open it later. Schedule a letter, room or message for a future moment.',cta:'Create a capsule'},
  keeps:{title:'Keeps',kicker:'Living memory archive',description:'Keep the moments worth keeping. Save selected letters, rooms, audio, photos and provenance privately.',cta:'Open Keeps'},
  exchange:{title:'Exchange',kicker:'Recipient control',description:'Change it quietly. Correct a size, colour, item or delivery time without awkwardness.',cta:'Manage a gift'},
  receipt:{title:'Receipt',kicker:'Universal gift receipt',description:'Exchange, repair or receive store credit without exposing purchase details or requiring the sender to forward a receipt.',cta:'Open receipt'},
  loop:{title:'Loop',kicker:'Keep, exchange, repair or pass it on',description:'When a gift is not right, choose what happens next without shame or unnecessary waste.',cta:'Choose an option'}
};

export const studioBlocks = [
  ['Memory Jar','Choose a colour to reveal a memory.'],['Love Letter','An envelope, your words and optional voice.'],
  ['Art4U','Funny or meaningful art made for one person.'],['Special Poem','Start with your own line. Get help only where you want it.'],
] as const;
