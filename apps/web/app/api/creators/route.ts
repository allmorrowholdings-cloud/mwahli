import {json} from '@/lib/http';import {listCreators} from '@/lib/repositories';export async function GET(){return json({items:await listCreators()})}
