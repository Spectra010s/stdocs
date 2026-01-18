import { 
  SDCLDocument, 
  SDCLDirective, 
  SDCLValue,
  StdocsConfig,
  ProjectConfig,
  HeaderConfig,
  HeroConfig,
  FooterConfig,
  FooterSection,
  SectionConfig,
  BuildConfig,
  SDCLValidationError
} from './types.js';

/**
 * SDCL Validator
 * 
 * Transforms the AST (SDCLDocument) into a typed and validated StdocsConfig object.
 */
export class Validator {
  private document: SDCLDocument;

  constructor(document: SDCLDocument) {
    this.document = document;
  }

  /**
   * Validate the document and return a full configuration object.
   */
  validate(): StdocsConfig {
    const config: Partial<StdocsConfig> = {
      sections: [],
      build: this.getDefaultBuild()
    };

    for (const directive of this.document.directives) {
      switch (directive.name) {
        case 'project':
          config.project = this.validateProject(directive);
          break;
        case 'header':
          config.header = this.validateHeader(directive);
          break;
        case 'hero':
          config.hero = this.validateHero(directive);
          break;
        case 'footer':
          config.footer = this.validateFooter(directive);
          break;
        case 'section':
          config.sections?.push(this.validateSection(directive));
          break;
        case 'build':
          config.build = { ...config.build, ...this.validateBuild(directive) };
          break;
      }
    }

    if (!config.project) {
      throw new SDCLValidationError('Missing required @project directive', 1, 1);
    }

    return config as StdocsConfig;
  }

  private validateProject(directive: SDCLDirective): ProjectConfig {
    const props = this.getProps(directive);
    return {
      title: this.getStr(props, 'title', directive, true),
      description: this.getStr(props, 'description', directive),
      logo: this.getStr(props, 'logo', directive),
      favicon: this.getStr(props, 'favicon', directive),
      version: (props.version as string) || '1.0.0',
      theme: this.getStr(props, 'theme', directive) || 'default',
      baseUrl: this.getStr(props, 'baseUrl', directive) || '/'
    };
  }

  private validateHeader(directive: SDCLDirective): HeaderConfig {
    const props = this.getProps(directive);
    return {
      links: props.links as unknown as HeaderConfig['links'],
      github: this.getStr(props, 'github', directive),
      themeToggle: props.themeToggle !== false,
      langSelect: props.langSelect !== false,
      defaultLang: this.getStr(props, 'defaultLang', directive),
      sticky: props.sticky === true
    };
  }

  private validateHero(directive: SDCLDirective): HeroConfig {
    const props = this.getProps(directive);
    return {
      title: this.getStr(props, 'title', directive, true),
      subtitle: this.getStr(props, 'subtitle', directive),
      ctas: props.ctas as unknown as HeroConfig['ctas'],
      cards: props.cards as unknown as HeroConfig['cards']
    };
  }

  private validateFooter(directive: SDCLDirective): FooterConfig {
    const props = this.getProps(directive);
    const sections: FooterSection[] = [];

    // Footer sections can be nested @section directives
    for (const p of directive.properties) {
      if ('type' in p && p.type === 'directive' && p.name === 'section') {
        sections.push(this.validateFooterSection(p));
      }
    }

    return {
      tagline: this.getStr(props, 'tagline', directive),
      madeBy: this.getStr(props, 'madeBy', directive),
      github: this.getStr(props, 'github', directive),
      sections: sections.length > 0 ? sections : undefined
    };
  }

  private validateFooterSection(directive: SDCLDirective): FooterSection {
    const props = this.getProps(directive);
    return {
      title: directive.identifier || 'Links',
      auto: props.auto !== false,
      links: props.links as unknown as FooterSection['links']
    };
  }

  private validateSection(directive: SDCLDirective): SectionConfig {
    const props = this.getProps(directive);
    if (!directive.identifier) {
      throw new SDCLValidationError('Section directive requires an identifier', directive.line, 1);
    }
    return {
      name: directive.identifier,
      order: (props.order as number) || 0,
      pages: (props.pages as unknown as string[]) || []
    };
  }

  private validateBuild(directive: SDCLDirective): BuildConfig {
    const props = this.getProps(directive);
    return {
      outputDir: this.getStr(props, 'outputDir', directive) || 'site',
      cleanFolder: props.cleanFolder !== false
    };
  }

  /**
   * Helper to extract key-value properties from a directive.
   */
  private getProps(directive: SDCLDirective): Record<string, SDCLValue> {
    const props: Record<string, SDCLValue> = {};
    for (const p of directive.properties) {
      if ('key' in p) {
        props[p.key] = p.value;
      }
    }
    return props;
  }

  /**
   * Helper to get a string property with optional requirement check.
   */
  private getStr(props: Record<string, SDCLValue>, key: string, directive: SDCLDirective, req = false): string {
    const val = props[key];
    if (req && val === undefined) {
      throw new SDCLValidationError(`Missing required property: ${key}`, directive.line, 1);
    }
    return typeof val === 'string' ? val : '';
  }

  private getDefaultBuild(): BuildConfig {
    return { outputDir: 'site', cleanFolder: true };
  }
}
