describe('Api #2', { tags: ['@regression'] }, () => {
  before('#2 before', () => {
    cy.log('#2 before');
  });

  beforeEach('#2 beforeEach', () => {
    cy.log('#2 beforeEach');
  });

  it('test #2.1', () => {
    expect(true).to.be.true;
  });

  it('test #2.1', () => {
    cy.wrap({}).then(() => {
      // @ts-expect-error works as expected
      cy.state('runnable').ctx.skip();
    });
    expect(false).to.be.false;
  });

  it('test #3.1', () => {
    expect(false).to.be.false;
  });

  describe('Api #2.1', {}, () => {
    before('#2.1 before', () => {
      cy.log('before');
    });

    beforeEach('#2.1 beforeEach', () => {
      cy.log('beforeEach');
    });

    it('test #2.1.1', () => {
      expect(true).to.be.true;
    });

    it('test #2.1.2', () => {
      cy.wrap({}).then(() => {
        // @ts-expect-error works as expected
        cy.state('runnable').ctx.skip();
      });
      expect(false).to.be.false;
    });

    it('test #2.1.3 with tag @smoke', { tags: ['@smoke'] }, () => {
      expect(false).to.be.false;
    });

    afterEach(() => {
      cy.log('#2.1 afterEach');
    });

    after(() => {
      cy.log('#2.1 after');
    });
  });

  afterEach(() => {
    cy.log('#2 afterEach');
  });

  after(() => {
    cy.log('#2 after');
  });
});