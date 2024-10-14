describe('Regression #1', { tags: ['@regression'] }, () => {
  before('#1 before', () => {
    cy.log('#1 before');
  });

  beforeEach('#1 beforeEach', () => {
    cy.log('#1 beforeEach');
  });

  it('test #1.1', () => {
    expect(true).to.be.true;
  });

  it('test #1.2', () => {
    cy.wrap({}).then(() => {
      // @ts-expect-error works as expected
      cy.state('runnable').ctx.skip();
    });
    expect(false).to.be.false;
  });

  it('test #1.3', () => {
    expect(false).to.be.false;
  });

  describe('Regression #1.1', {}, () => {
    before('#1.1 before', () => {
      cy.log('before');
    });

    beforeEach('#1.1 beforeEach', () => {
      cy.log('beforeEach');
    });

    it('test #1.1.1', () => {
      expect(true).to.be.true;
    });

    it('test #1.1.2', () => {
      cy.wrap({}).then(() => {
        // @ts-expect-error works as expected
        cy.state('runnable').ctx.skip();
      });
      expect(false).to.be.false;
    });

    it('test #1.1.3', () => {
      expect(false).to.be.false;
    });

    afterEach(() => {
      cy.log('#1.1 afterEach');
    });

    after(() => {
      cy.log('#1.1 after');
    });
  });

  afterEach(() => {
    cy.log('#1 afterEach');
  });

  after(() => {
    cy.log('#1 after');
  });
});
