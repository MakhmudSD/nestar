import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberService } from '../member/member.service';
import { Follower, Following } from '../../libs/dto/follow/follow';

@Injectable()
export class FollowService {
	constructor(
		@InjectModel('Follow') private readonly propertyModel: Model<Follower | Following>,
		private memberService: MemberService,
	) {}
}
