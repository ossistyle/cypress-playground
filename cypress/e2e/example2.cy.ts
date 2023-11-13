describe('Outer', { failFast: { enabled: true }, tags: ['@example2'] }, () => {
  const globalInnerVar = 'globalVar';
  before(() => {
    cy.log('global before');
  });

  beforeEach(() => {
    cy.log('global beforeEach');
  });
  describe('Inner #1', { failFast: { enabled: true } }, () => {
    const firstInnerVar = 'firstInnerVar';
    before(() => {
      cy.log('#1 retryableBefore');
      cy.log(globalInnerVar);
      cy.log(firstInnerVar);
    });

    beforeEach(() => {
      cy.log('#1 beforeEach');
      cy.log(firstInnerVar);
    });

    it('#1', () => {
      cy.log('from it');
      cy.log(firstInnerVar);
      expect(true).to.be.true;
    });

    it('#2', {}, () => {
      cy.log('from it 2');
      cy.log(firstInnerVar);
      expect(true).to.be.false;
    });

    it('#3', {}, () => {
      cy.log('from it 2');
      expect(true).to.be.false;
    });

    afterEach(() => {
      cy.log('#1 afterEach');
    });

    after(() => {
      cy.log('#1 after');
    });
  });
  describe('Inner #2', { failFast: { enabled: false } }, () => {
    const secondInnerVar = 'secondInnerVar';
    it('passed it', () => {
      cy.log('from it');
      cy.log(globalInnerVar);
      cy.log(secondInnerVar);
      expect(true).to.be.true;
    });

    it('passed it 2', () => {
      cy.log('from it 2');
      expect(true).to.be.true;
    });
  });

  describe('Inner #3', () => {
    it('passed it', () => {
      cy.log('from it');
      cy.log(globalInnerVar);
      expect(true).to.be.false;
    });

    it('passed it 2', () => {
      cy.log('from it 2');
      expect(true).to.be.true;
    });
  });

  afterEach(() => {
    cy.log('from afterEach');
  });

  after(() => {
    cy.log('from after');
  });

  after(() => {
    cy.log('from after 2');
  });
});
