/* eslint-disable*/
import { showAlert } from './alert';
import axios from 'axios';
const stripe = Stripe(
  'pk_test_51Hc7cICXP0z1fpQgUiteOmC3BQcNHVTNfSBtV3o6smdeadV9XFOhfw0QlHQgqA5aHuWgNrRIztXyUW38SxIcV8Ls00oCmLNlOs'
);

export const bookTour = async (tourId) => {
  try {
    //1)Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);
    //2)Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
