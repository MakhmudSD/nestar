import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { T } from '../../libs/types/common';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

	public async recordView(input: ViewInput): Promise<View | null> {
		const viewExist = await this.checkViewExistence(input);
		if (!viewExist) {
			console.log(' - New View Insert -');
			const newViewData = {
				...input,
				memberId: new Types.ObjectId(input.memberId as any),
				viewRefId: new Types.ObjectId(input.viewRefId as any),
			};
			return await this.viewModel.create(newViewData);
		}
		return null;
	}
	
	public async checkViewExistence(input: ViewInput): Promise<View | null> {
		const { memberId, viewRefId } = input;
		const search: T = {
			memberId: new Types.ObjectId(memberId as any),
			viewRefId: new Types.ObjectId(viewRefId as any),
		};
		return await this.viewModel.findOne(search).exec();
	}
}
