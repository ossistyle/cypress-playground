const i18n = require('../fixtures/i18n/start.json')
const language = Cypress.env('language') 

describe('/start.html', () => {

    const options = {        
        headers: {'accept-language': language}
    }
    beforeEach(() => {
        cy.login('qa', '5Uvem1gIcnuX{Al&F5mkoCc>') 
        cy.visit('/', options)       
    })
    it('shows navigation bar', () => {
        cy.get('betty-titlebar')
            .should('be.visible')
            .and('not.be.empty')
            .and('contain', 'Navigation')
    })

    it('shows asset icon and text', () => {
        cy.get('[icon="asset"]')
            .should('be.visible')            
            .siblings('div.globalnav-homecard-title')
            .should('have.text', 'Assets')
    })
})