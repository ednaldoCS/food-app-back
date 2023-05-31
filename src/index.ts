import dotenv from 'dotenv';

import express, {Express, Request,Response} from 'express';

import { PrismaClient } from '@prisma/client'
import { SnackData } from './interfaces/SnackData';
import { CustomerData } from './interfaces/CustomerData';
import {PaymentData} from './interfaces/PaymentData'


import CheckoutService from './services/CheckoutService'
dotenv.config();

// stripe.api_key='sk_test_51M3nfhJt26NDgDxUvmKbxmVVvagKO5SlKw1mxfyX55k5r9uSKZ8PROYT98f96JFbKBkAfFXu4fI8Bso2oPaoDj4700eHoPV4DP'

const app:Express =express();


const port = process.env.PORT || 5000

const prisma = new PrismaClient()

app.use(express.json());

app.use((req:Request, res:Response, next)=>{
	res.setHeader("Access-Control-Allow-Origin","http://localhost:3000");
	res.setHeader('Content-Type', 'application/json')
	res.setHeader("Access-Control-Allow-Headers","Access-Control-Allow-Origin, Content-Type")

	next()
})

// const paymentIntent= async(amount:number)=>{
	
// 	const data=await stripe.paymentIntents.create({
// 		amount,
// 		currency:'brl'
// 	})


// 	return data
	
// }

// interface paymentCardMethodProps{
// 	number: string,
//     exp_month: number,
//     exp_year: number,
//     cvc: string
// }



// const paymentMethod=async(card:paymentCardMethodProps)=>{

// 	const paymentMethodData=await stripe.paymentMethods.create({
// 		type: 'card',
// 		card:card,
// 		billing_details:{
// 			name:'Ednaldo cavalcnate serafim'
// 		}
// 	})


// 	return paymentMethodData

	
// }


// app.post('/payment_pre_connect', async (req:Request, res:Response)=>{



// 		try{
// 			let paymentIntentData=await paymentIntent(req.body.amount)
// 			let paymentMethodObj=await paymentMethod(req.body.card)
			
// 			res.json({
// 				status:200,
// 				paymentIntentId:paymentIntentData.id,
// 				paymentMethodId:paymentMethodObj.id
// 			})
// 		}catch(error){
// 			res.json({
// 				status:500,
// 				text: 'Pagamento negado',
// 				error
// 			})

// 		}

		

// })

// app.post('/payment_validation',async (req:Request, res:Response)=>{
// 	const {paymentIntentId,paymentMethodId}=req.body


// 	try{

// 		const paymentIntentConfirm=await stripe.paymentIntents.confirm(paymentIntentId,{
// 			payment_method:paymentMethodId
// 		})

// 		console.log(paymentIntentConfirm)

// 		res.json({
// 			status:200,
// 			payment_status:paymentIntentConfirm
// 		})
// 	}catch(err){
// 		console.log(err)
// 		res.json({
// 			status:500,
// 			text:'Pagamento negado',
// 			err
// 		})
// 	}
// })


app.get('/:snack', async(req:Request, res:Response)=>{

	const {snack}=req.params

	try{
		const snacks= await prisma.snack.findMany({
			where:{
				snack
			}
		})

		res.status(200).json(snacks)
	}catch(err){
		console.log(err)
		res.status(400).send({
			message:'Snack inexistente ou nome inocorreto!'
		})	
	}

})



app.get('/orders/:id', async(req:Request, res:Response)=>{
	const {id}=req.params 

	const order= await prisma.order.findUnique({
		where:{
			id: +id,
		},
		include:{
			OrderItem:true
		}
	})

	if (!order) return res.status(404).send({error: "Order not found"})

	res.send(order)
})


interface CheckoutRequest extends Request{
	body:{
		cart:SnackData[]
		customer: CustomerData
		payment: PaymentData
	}
}

app.post('/checkout',async(req:CheckoutRequest, res:Response)=>{
	const {cart, customer, payment}=req.body

	try{
		const checkoutService= new CheckoutService()

		const response= await checkoutService.process(cart, customer, payment)


		res.json(response)

	}catch(error){
		res.json({
			status:500,
			text:error
		})
	}
})



app.listen(port, ()=> console.log('Server running on port ' + port ))