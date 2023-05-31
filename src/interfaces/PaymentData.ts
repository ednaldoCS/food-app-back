export interface PaymentData{
	card:{
        number: string,
        exp_month: number,
        exp_year: number,
        cvc: string,
    },
    billing_details:{
        address:{
            city:string
            line1:string
        }
        name:string,
        email:string,
        phone:string
    },
    amount:number
}