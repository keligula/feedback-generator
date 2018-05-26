import React, { Component } from 'react';
import StripeCheckout from 'react-stripe-checkout';
import { connect } from 'react-redux';
import * as actions from '../actions';

class Payments extends Component {
    render() {
        return (
            <StripeCheckout
                name="Feedback Generator"
                description="$5 bucks for 5 email credits"
                amount={500} //value is in US cents
                token={token => this.props.handleToken(token)}
                stripeKey={process.env.REACT_APP_STRIPE_KEY}
            >
                <button className="btn">ADD CREDITS</button>
            </StripeCheckout>
        );
    }
}

export default connect(null, actions)(Payments);
