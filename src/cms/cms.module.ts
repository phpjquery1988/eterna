import { Module } from '@nestjs/common';
import { CmsController } from './controllers/profile.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentProfile, AgentProfileSchema } from './entities/profile.schema';
import { CmsService } from './services/profile.service';
import { Employee, EmployeeSchema } from 'src/employee/entities/employee.schema';
import { ServicesController } from './controllers/service.controller';
import { ServicesService } from './services/service.service';
import { Service, ServiceSchema } from './entities/services.schema';
import { TestimonialsController } from './controllers/testimonials.controller';
import { TestimonialsService } from './services/testimonials.service';
import { Testimonial, TestimonialSchema } from './entities/testimonials.schema';
import { PortfolioController } from './controllers/portfolio.controller';
import { PortfolioService } from './services/portfolio.service';
import { Portfolio, PortfolioSchema } from './entities/portfolio.schema';
import { CallToActionController } from './controllers/call-to-action.controller';
import { CallToActionService } from './services/call-to-action.service';
import { CallToAction, CallToActionSchema } from './entities/call-to-action.schema';
import { BlogController } from './controllers/blog.controller';
import { BlogService } from './services/blog.service';
import { Blog, BlogSchema } from './entities/blog.schema';
import { GalleryController } from './controllers/gallery.controller';
import { GalleryService } from './services/gallery.service';
import { Gallery, GallerySchema } from './entities/gallery.schema';
import { FAQService } from './services/faq.service';
import { FAQController } from './controllers/faq.controller';
import { FAQ, FAQSchema } from './entities/faq.schema';
import { InsuranceProductController } from './controllers/insurance-product.controller';
import { InsuranceProductService } from './services/insurance-product.service';
import { InsuranceProduct, InsuranceProductSchema } from './entities/insurance-product.schema';
import { ContactFormController } from './controllers/contact-form.controller';
import { ContactFormService } from './services/create-contact.service';
import { ContactForm, ContactFormSchema } from './entities/contact-form.schema';
import { SeoSettingsController } from './controllers/seo-setting.controller';
import { SeoSettingsService } from './services/seo-settings.service';
import { SeoSettings, SeoSettingsSchema } from './entities/seo-settings.schema';
import { ViewController } from './controllers/view.controller';
import { ViewService } from './services/view.service';
import { License, LicenseSchema } from 'src/employee/entities/license.schema';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: AgentProfile.name,
        useFactory: () => {
          const schema = AgentProfileSchema;
          schema.pre('save', function (next) {
            this.updatedAt = new Date();
            next();
          });
          return schema;
        },
      },
      {
        name: Employee.name,
        useFactory: () => {
          const schema = EmployeeSchema
          return schema;
        },
      },

      {
        name: Service.name,
        useFactory: () => {
          const schema = ServiceSchema
          return schema;
        },
      },


      {
        name: Testimonial.name,
        useFactory: () => {
          const schema = TestimonialSchema
          return schema;
        },
      },

      {
        name: Portfolio.name,
        useFactory: () => {
          const schema = PortfolioSchema
          return schema;
        },
      },

      {
        name: CallToAction.name,
        useFactory: () => {
          const schema = CallToActionSchema
          return schema;
        },
      },
      {
        name: Blog.name,
        useFactory: () => {
          const schema = BlogSchema
          return schema;
        },
      },

      {
        name: Gallery.name,
        useFactory: () => {
          const schema = GallerySchema
          return schema;
        },
      },

      {
        name: FAQ.name,
        useFactory: () => {
          const schema = FAQSchema
          return schema;
        },
      },

      {
        name: InsuranceProduct.name,
        useFactory: () => {
          const schema = InsuranceProductSchema
          return schema;
        },
      },

      {
        name: ContactForm.name,
        useFactory: () => {
          const schema = ContactFormSchema
          return schema;
        },
      },
      {
        name: SeoSettings.name,
        useFactory: () => {
          const schema = SeoSettingsSchema
          return schema;
        },
      },

      {
        name: License.name,
        useFactory: () => {
          const schema = LicenseSchema
          return schema;
        },
      },

    ]),
  ],
  controllers: [
    CmsController, ServicesController, TestimonialsController,
    PortfolioController, CallToActionController, BlogController,
    GalleryController, FAQController, InsuranceProductController,
    ContactFormController, SeoSettingsController, ViewController
  ],
  providers: [
    CmsService, ServicesService, TestimonialsService,
    PortfolioService, CallToActionService, BlogService,
    GalleryService, FAQService, InsuranceProductService,
    ContactFormService, SeoSettingsService, ViewService
  ]
})
export class CmsModule { }
