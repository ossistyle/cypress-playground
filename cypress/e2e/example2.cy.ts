describe(
  'Example #2',
  { failFast: { enabled: true }, tags: ['@example2'] },
  () => {
    const globalInnerVar = 'globalVar';
    before(() => {
      cy.log('global before');
    });

    beforeEach(() => {
      cy.log('global beforeEach');
    });

    it('Test #1', () => {
      cy.log('from it 1');
      cy.log(globalInnerVar);
      expect(true).to.be.false;
    });

    it('Test #3', () => {
      cy.log('from it 2');
      expect(true).to.be.true;
    });

    afterEach(() => {
      cy.log('afterEach');
    });

    after(() => {
      cy.log('after');
    });
  },
);
