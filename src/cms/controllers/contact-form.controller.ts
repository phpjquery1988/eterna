import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards, Request, BadGatewayException, NotFoundException } from '@nestjs/common';
import { ContactFormService } from '../services/create-contact.service';
import { CreateContactFormDto } from '../dto/contact-form/create-contact-form';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';

@Controller('v1/contact-form')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class ContactFormController {
  constructor(private readonly contactFormService: ContactFormService) { }

  @Post()
  async createContactForm(@Body() createContactFormDto: CreateContactFormDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.contactFormService.create(createContactFormDto, npn);
  }

  @Get('all')
  async getAllContactForms(@Query() paginateDto: PaginationDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.contactFormService.findAll(paginateDto, npn);
  }

  @Get('by-profile')
  async getContactFormsByAgentProfile(@Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.contactFormService.findByAgentProfile(npn);
  }

  @Get()
  async getContactFormById(@Query() objectIdDto: ObjectIdDto) {
    return this.contactFormService.findById(objectIdDto.id);
  }

  @Delete()
  async deleteContactForm(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.contactFormService.deleteById(objectIdDto.id, npn);
  }

  @Put()
  async updateContactForm(@Query() objectIdDto: ObjectIdDto, @Body() updateContactFormDto: Partial<CreateContactFormDto>, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    const form = await this.contactFormService.updateById(objectIdDto.id, updateContactFormDto, npn);
    console.log("🚀 ~ ContactFormController ~ updateContactForm ~ form:", form)
    if (!form) {
      throw new NotFoundException('Contact form not found');
    }
  }
}
