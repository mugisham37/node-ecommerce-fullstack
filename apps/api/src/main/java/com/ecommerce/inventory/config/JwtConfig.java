package com.ecommerce.inventory.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * JWT Configuration properties
 * Maps JWT settings from application.yml
 */
@Configuration
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {

    private String secret;
    private int expiration;
    private int refreshExpiration;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public int getExpiration() {
        return expiration;
    }

    public void setExpiration(int expiration) {
        this.expiration = expiration;
    }

    public int getRefreshExpiration() {
        return refreshExpiration;
    }

    public void setRefreshExpiration(int refreshExpiration) {
        this.refreshExpiration = refreshExpiration;
    }

    @Override
    public String toString() {
        return "JwtConfig{" +
                "expiration=" + expiration +
                ", refreshExpiration=" + refreshExpiration +
                '}';
    }
}