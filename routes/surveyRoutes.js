const _ = require('lodash');
const pathParser = require('path-parser');
const { URL } = require('url');
const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const requireCredits = require('../middlewares/requireCredits');
const Mailer = require('../services/Mailer');
const surveyTemplate = require('../services/emailTemplates/surveyTemplate');

const Survey = mongoose.model('surveys');

module.exports = app => {
    // Get all surveys created by the logged in user
    app.get('/api/surveys', requireLogin, async (req, res) => {
        const surveys = await Survey.find({ _user: req.user.id }).select({ recipients: false });

        res.send(surveys);
    });

    // Redirect after survey recipient clicks on Y/N feedback inside emailed survey
    app.get('/api/surveys/:surveyId/:choice', (req, res) => {
        res.send('Thanks for providing feedback!');
    });

    // Posts recipient response to database, updates Survey records
    app.post('/api/surveys/webhooks', (req, res) => {
        const p = new pathParser.Path('/api/surveys/:surveyId/:choice');

        _.chain(req.body)
            .map(({ email, url }) => {
                const match = p.test(new URL(url).pathname);
                if (match) {
                    return { email, surveyId: match.surveyId, choice: match.choice };
                }
            })
            .compact() // Removes undefined elements
            .uniqBy('email', 'surveyId') // Removes duplicates to prevent more than 1 vote per recipient/survey
            .each(({ surveyId, email, choice }) => {
                // Updates database properties 'responded' and 'choice'
                Survey.updateOne(
                    {
                        _id: surveyId,
                        recipients: {
                            $elemMatch: { email: email, responded: false }
                        }
                    },
                    {
                        $inc: { [choice]: 1 },
                        $set: { 'recipients.$.responded': true },
                        lastResponded: new Date()
                    }
                ).exec();
            })
            .value();

        res.send({});
    });

    // Creates a new survey
    app.post('/api/surveys', requireLogin, requireCredits, async (req, res) => {
        const { title, subject, body, recipients } = req.body;

        const survey = new Survey({
            title,
            body,
            subject,
            recipients: recipients
                .split(',')
                .filter(email => {
                    const emailTrimmed = email.trim();

                    if (emailTrimmed !== '') {
                        return true;
                    }
                })
                .map(email => ({ email })),
            _user: req.user.id,
            dateSent: Date.now()
        });

        // Create email
        const mailer = new Mailer(survey, surveyTemplate(survey));

        // Send email, update credits
        try {
            await mailer.send();
            await survey.save();
            req.user.credits -= 1;
            const user = await req.user.save();

            res.send(user);
        } catch (err) {
            res.status(422).send(err);
        }
    });
};
