export type RelationshipKind='partner'|'friend'|'parent'|'child'|'sibling'|'mentor'|'team'|'custom';
export type Feeling='loved'|'seen'|'proud'|'amused'|'comforted'|'surprised'|'desired'|'remembered'|'supported';
export type MomentKind='birthday'|'apology'|'anniversary'|'friendship'|'care'|'grief'|'congratulations'|'just_because'|'custom';
export type StudioBlockType='memory_jar'|'art4u'|'love_letter'|'special_poem'|'playlist'|'love_cards'|'ambiance_room'|'reasons'|'timeline'|'open_when'|'mini_cinema'|'secret_code'|'scavenger_hunt'|'voice_capsule'|'future_message'|'virtual_garden'|'photo_puzzle'|'story_path'|'custom_room';
export type RecipientBoundary={noSurprises?:boolean;noFood?:boolean;preferredTimes?:string[];blockedSenderIds?:string[];notes?:string};
export type SelectiveDisclosure={transactionId:string;fields:string[];expiresAt:string;recipientApprovedAt:string};
export type MeaningfulMoment={id:string;senderId:string;recipientId?:string;experienceId?:string;orderId?:string;reached:boolean;openedOrReceived:boolean;safetyReversed:boolean;fraudReversed:boolean;fulfilmentFailed:boolean};
export const isMeaningfulMomentCompleted=(m:MeaningfulMoment)=>m.reached&&m.openedOrReceived&&!m.safetyReversed&&!m.fraudReversed&&!m.fulfilmentFailed;
export const requiresHumanApproval=(block:StudioBlockType)=>['love_letter','special_poem','reasons','open_when','future_message'].includes(block);
export function canContactRecipient(input:{blocked:boolean;noContact:boolean;surpriseOptOut:boolean;action:'message'|'gift'|'surprise'|'care'}){if(input.blocked||input.noContact)return false;if(input.action==='surprise'&&input.surpriseOptOut)return false;return true}
