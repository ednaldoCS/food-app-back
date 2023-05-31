import { OrderItem, PrismaClient,Customer,Snack} from '@prisma/client';

import { SnackData } from '../interfaces/SnackData';
import { CustomerData } from '../interfaces/CustomerData';
import { PaymentData } from '../interfaces/PaymentData';


import Stripe from 'stripe'




const stripe= new Stripe('sk_test_51M3nfhJt26NDgDxUvmKbxmVVvagKO5SlKw1mxfyX55k5r9uSKZ8PROYT98f96JFbKBkAfFXu4fI8Bso2oPaoDj4700eHoPV4DP',{
	apiVersion:'2022-11-15'
})


export default class CheckoutService{
	private prisma: PrismaClient


	constructor(){
		this.prisma = new PrismaClient()
	}


	async process(cart: SnackData[], customer: CustomerData, payment: PaymentData){
		// TODO: 'Puxar dados de snacks do db'

		const snacks=await this.prisma.snack.findMany({
			where:{
				id:{
					in : cart.map((snack)=>Number(snack.id)) as number[]
				}
			}
		})

		const snacksInCart=snacks.map((snack)=>({
			...snack,
			quantity:cart.find((item)=>Number(item.id) == Number(snack.id))?.quantity!,
			price:Number(snack.price),
			subtotal:cart.find((item)=>Number(item.id) == Number(snack.id))?.quantity! * Number(snack.price)

		}))

		// TODO: Registrar dados client no db

		const customerCreated= await this.createCustomer(customer)
		

		// TODO:  Criar order

		const orderCreated=await this.createOrder(snacksInCart,customerCreated)

		// TODO:  Processar pagamento
		const paymentIntentId=await  this.createPaymentIntent(payment.amount)
		const paymentMethodId=await this.createPaymentMethod(payment)

		const {payment_status}=await this.confirmPayment(paymentIntentId.id , paymentMethodId.id)

		if( payment_status && payment_status.status === 'succeeded' ){
			try{
				const orderUpdated = await this.prisma.order.update({
					where:{
						id:orderCreated.id
					},
					data:{
						trasactionId:payment_status.id
					}
				})


				return{
					status:200,
					text:'Pagamento realizado',
					payment_details:payment_status
				}

			}catch(err){
				return {
					err,
					status:500
				}
			}


		}


	}


	private async createCustomer(customer:CustomerData):Promise<Customer>{
		const customerCreated= await this.prisma.customer.upsert({
			where:{email:customer.email},
			update:customer,
			create:customer
		})
		return customerCreated
	}

	private async createOrder(snacksInCart:any,customer:Customer){

		const total= snacksInCart.reduce((acc:number, snack:SnackData)=> acc += Number(snack.subtotal), 0)
		

		const orderCreated= await this.prisma.order.create({
			data:{
				total,
				customer:{connect:{id:customer.id}},
				OrderItem:{
					createMany:{
						data:snacksInCart.map((snack:SnackData)=>({
							snackId:snack.id,
							quantity:snack.quantity,
							subtotal:snack.subtotal
						}))
					}
				}
			},
			include:{
				customer:true,
				OrderItem:{
					include:{
						snack:true
					}
				}
			}
		})


		return orderCreated
	}


	private async createPaymentIntent(amount:number){
			
			const data=await stripe.paymentIntents.create({
				amount,
				currency:'brl'
			})


			return data
			
		}


	private async  createPaymentMethod(payment:PaymentData){

		const paymentMethodData=await stripe.paymentMethods.create({
			type: 'card',
			card:payment.card,
			billing_details:payment.billing_details
		})


		return paymentMethodData
	}    

	private async confirmPayment(paymentIntentId:string, paymentMethodId:string){
		try{

			const paymentIntentConfirm=await stripe.paymentIntents.confirm(paymentIntentId,{
				payment_method:paymentMethodId
			})


			return({
				status:200,
				payment_status:paymentIntentConfirm
			})
		}catch(err){
			
			return({
				status:500,
				text:'Pagamento negado',
				err
			})
		}
	}
}
