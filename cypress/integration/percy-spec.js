context('percy playground', () => {
  describe('page with custom form elements', () => {
    it('can take snapshot with less form elements', () => {
      cy.visit('web/AEM Assets Asset Details.html');
      cy.percySnapshot();
    });
    it('can take snapshot with many form elements', () => {
      cy.visit('web/AEM Assets Asset Metadata.html');
      cy.percySnapshot();
    });
  });
});
