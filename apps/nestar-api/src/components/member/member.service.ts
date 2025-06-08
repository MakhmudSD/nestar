import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { MemberStatus } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';
import { response } from 'express';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private authService: AuthService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		// TODO: Hash expected
		input.memberPassword = await this.authService.hashPassword(input.memberPassword);
		try {
			const result = await this.memberModel.create(input);
			return result;
		} catch (err) {
			console.log('ERROR on service Model of signup', err.message);
			throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const { memberNick, memberPassword } = input;
		const response = await this.memberModel.findOne({ memberNick }).select('+memberPassword').exec();
	  
		if (!response || response.memberStatus === MemberStatus.DELETE) {
		  throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
		} else if (response.memberStatus === MemberStatus.BLOCK) {
		  throw new InternalServerErrorException(Message.BLOCKED_USER);
		}
	  
		if (!response.memberPassword) {
		  throw new InternalServerErrorException(Message.NO_PASSWORD_FOUND);
		}
	  
		const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
		if (!isMatch) {
		  throw new InternalServerErrorException(Message.WRONG_PASSWORD);
		}
	  
		return response;
	  }
	  

	public async updateMember(): Promise<string> {
		return 'updateMember executed';
	}

	public async getMember(): Promise<string> {
		return 'getMember executed';
	}
}
