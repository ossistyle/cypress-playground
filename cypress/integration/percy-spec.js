context('percy playground', () => {
  describe('page with custom elements', () => {
    it('can take snapshot', () => {
      cy.visit('web/AEM Assets Asset Details.html');
      cy.percySnapshot();
    });
  });
});
