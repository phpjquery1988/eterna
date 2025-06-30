import { Controller, Get, Post, Query } from "@nestjs/common";
import { ObjectIdDto } from "../dto/common.dto";
import { ViewService } from "../services/view.service";


@Controller('v1/view')
export class ViewController {
   constructor(
      private readonly viewServiceModel: ViewService
   ) { }


   @Get()
   view(@Query('hash') hash: string) {
      return this.viewServiceModel.view(hash)
   }

   @Post()
   approve(@Query() ObjectIdDto: ObjectIdDto) {
      return "approve"
   }
}
