import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { InternalServerErrorException, UsePipes, ValidationPipe } from '@nestjs/common';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';

@Resolver()
export class MemberResolver {
	constructor(private readonly memberService: MemberService) {}

	@Mutation(() => Member)
	@UsePipes(ValidationPipe)
	public async signup(@Args('input') input: MemberInput): Promise<Member> {
		try {
			console.log('Mutation: signup');
			console.log('MemberInput', input);
			return this.memberService.signup(input);
		} catch (err) {
			console.log('ERROR on signup', err);
			throw new InternalServerErrorException(err);
		}
	}

	@Mutation(() => Member)
	@UsePipes(ValidationPipe)
	public async login(@Args('input') input: LoginInput): Promise<Member> {
		try {
			console.log('Mutation: login');
			console.log('LoginInput', input);
			return this.memberService.login(input);
		} catch (err) {
			console.log('ERROR on signup', err);
			throw new InternalServerErrorException(err);
		}
	}

	@Mutation(() => String)
	public async updateMember(): Promise<String> {
		console.log('Mutation: updateMember');
		return this.memberService.updateMember();
	}

	@Query(() => String)
	public async getMember(): Promise<String> {
		console.log('Mutation: getMember');
		return this.memberService.getMember();
	}
}
