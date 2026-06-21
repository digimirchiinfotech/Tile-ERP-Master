import React from 'react';
import { Card } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * PremiumCard
 * A reusable, standardized premium card component that replaces basic Bootstrap cards
 * and inline styled cards, implementing the global design system's hover effects,
 * glassmorphism, and structural consistencies.
 */
const PremiumCard = ({
  children,
  className = '',
  header,
  headerClassName = '',
  bodyClassName = '',
  isGlass = false,
  isHoverable = false,
  ...props
}) => {
  const baseClass = isGlass ? 'glass-effect' : 'premium-card';
  const hoverClass = isHoverable ? 'hover-scale' : '';

  return (
    <Card className={`${baseClass} ${hoverClass} ${className} border-0`} {...props}>
      {header && (
        <Card.Header className={`bg-transparent border-bottom-0 pt-4 pb-2 px-4 ${headerClassName}`}>
          {typeof header === 'string' ? (
            <h5 className="mb-0 fw-bold text-dark">{header}</h5>
          ) : (
            header
          )}
        </Card.Header>
      )}
      {/* Support for children without explicit PremiumCard.Body if they pass header prop */}
      {React.Children.toArray(children).some(child => 
        child && typeof child === 'object' && (child.type === PremiumCard.Body || child.type === PremiumCard.Header)
      ) ? children : (
        <Card.Body className={`p-4 ${bodyClassName}`}>
          {children}
        </Card.Body>
      )}
    </Card>
  );
};

PremiumCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  header: PropTypes.node,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  isGlass: PropTypes.bool,
  isHoverable: PropTypes.bool,
};

PremiumCard.Body = Card.Body;
PremiumCard.Header = Card.Header;
PremiumCard.Footer = Card.Footer;
PremiumCard.Img = Card.Img;
PremiumCard.ImgOverlay = Card.ImgOverlay;
PremiumCard.Title = Card.Title;
PremiumCard.Subtitle = Card.Subtitle;
PremiumCard.Text = Card.Text;
PremiumCard.Link = Card.Link;

export default PremiumCard;
