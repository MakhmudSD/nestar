import { PropertyStatus } from './../../libs/enums/property.enum';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
	AgentsPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '../../libs/dto/property/property.input';
import { Properties, Property } from '../../libs/dto/property/property';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { ViewService } from '../view/view.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import * as moment from 'moment';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property | null>,
		private memberService: MemberService,
		private viewService: ViewService,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		try {
			const result: any = await this.propertyModel.create(input);
			await this.memberService.memberStatsEditor({ _id: result.memberId, targetKey: 'memberProperties', modifier: 1 });
			return result;
		} catch (err) {
			console.log('ERROR on service Model of signup', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
		const search: T = {
			_id: propertyId,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		const targetProperty: Property | null = await this.propertyModel.findOne(search).lean().exec();
		if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
				targetProperty.propertyViews++;
			}
		}

		targetProperty.memberData = await this.memberService.getMember(null, targetProperty.memberId);
		return targetProperty;
	}

	public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
		const { propertyStatus } = input;

		if (propertyStatus === PropertyStatus.SOLD) {
			input.soldAt = moment().toDate();
		} else if (propertyStatus === PropertyStatus.DELETE) {
			input.deletedAt = moment().toDate();
		}

		const search: T = {
			_id: input._id,
			memberId: memberId,
		};

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (input.soldAt || input.deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	}

	public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		console.log('match:', match);

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const search = input.search;
		if (!search) return;
		const {
			memberId,
			locationList,
			roomsList,
			bedsList,
			typeList,
			periodsRange,
			squaresRange,
			pricesRange,
			options,
			text,
		} = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList) match.propertyLocation = { $in: locationList };
		if (roomsList) match.propertyRooms = { $in: roomsList };
		if (bedsList) match.propertyBeds = { $in: bedsList };
		if (typeList) match.propertyType = { $in: typeList };

		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	}

	public async getAgentsProperties(memberId: ObjectId, input: AgentsPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new InternalServerErrorException(Message.NOT_ALLOWED_REQUEST);

		const match: T = { memberId: memberId, propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE } };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getAllPropertiesByAdmin(memberId: ObjectId, input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = propertyLocationList;

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result: Property | null = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}
		return result;
	}

	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: T = {
			_id: propertyId,
			propertyStatus: PropertyStatus.DELETE,
		};
		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	public async propertyStatsEditor(input: StatisticModifier): Promise<Property | null> {
		const { _id, targetKey, modifier } = input;
		const updated = await this.propertyModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.lean()
			.exec();

		return updated as Property | null;
	}
}
