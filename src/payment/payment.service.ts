import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/databases/prisma.service';
import Razorpay from 'razorpay';
import { User } from '@prisma/client'; 
@Injectable()
export class PaymentService {
    private razorpay: Razorpay;

    constructor(private prisma: PrismaService) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  
    async connectRazorpay(userId: number) {
        // 1. Fetch user
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
      
        if (!user) throw new BadRequestException("User not found");
      
        // 2. If already connected
        if (user.razorpayAccountId) {
          return { alreadyConnected: true };
        }
      
        // 3. Create Razorpay Linked Account (Route)
        const account = await this.razorpay.accounts.create({
          email: user.email,
          phone: (user as any).phone ?? "9999999999", // or add phone to your model properly
          legal_business_name: user.name,
          contact_name: user.name,
          business_type: "individual",
          profile: {
            category: "freelancer",
            subcategory: "developer",
            description: "Freelancer on the platform",
          },
        });
      
        // 4. Save in DB
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            razorpayAccountId: account.id,
          },
        });
      
        // 5. For now, just return account info (no onboarding link)
        return {
          success: true,
          accountId: account.id,
          // optional: message to show in UI
          message: "Razorpay account created and linked. Complete KYC from Razorpay dashboard.",
          status : 200
        };
      }
      
      
}
