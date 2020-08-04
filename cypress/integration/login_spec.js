const i18n = require('../fixtures/i18n/login.json')
const language = Cypress.env('language')

describe('/login.html', () => {

    const options = {
        headers: { 'accept-language': language }
    }
    beforeEach(() => {
        cy.visit('/', options)
    })

    it('greets with welcome message', () => {
        cy.get('h1')
            .should('have.text', i18n['login_welcome_message'][language])
    })

    it('requires username', () => {
        cy.get('#username').type('dfsadfas{enter}')
        cy.get('#error')
            .should('contain', i18n['login_values_not_match'][language])
    })

    it('requires valid username and password', () => {
        cy.get('#username').type('dfsadfas')
        cy.get('#password').type('dfsadfas{enter}')
        cy.get('#error')
            .should('contain', i18n['login_values_not_match'][language])
    })

    it('navigates to aem/start.html on successful login', () => {
        cy.get('#username').type('qa')
        cy.get('#password').type('5Uvem1gIcnuX{Al&F5mkoCc>', {
            'parseSpecialCharSequences': false
        })
        cy.get('#submit-button').click()
        cy.url().should('contain', 'aem/start.html')
    })

    it('has a placeholder for username', () => {
        cy.get('#username')
            .should('have.attr', 'placeholder', i18n['login_username_placeholder'][language])
    })

    it('has a placeholder for username', () => {
        cy.get('#password')
            .should('have.attr', 'placeholder', i18n['login_password_placeholder'][language])
    })
})
